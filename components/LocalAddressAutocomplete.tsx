"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AddressLookup } from "@/types/app";

export type SelectedLocalAddress = {
  address: string;
  gnaf_pid: string | null;
  lat: number | null;
  lng: number | null;
};

type LocalAddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: SelectedLocalAddress) => void;
  placeholder?: string;
};

export default function LocalAddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing address",
}: LocalAddressAutocompleteProps) {
  const [results, setResults] = useState<AddressLookup[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchValue = value.trim();

    if (searchValue.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchAddresses(searchValue);
    }, 300);

    return () => clearTimeout(timeout);
  }, [value]);

  async function searchAddresses(searchValue: string) {
    setLoading(true);

    const { data, error } = await supabase.rpc("search_addresses", {
      search_term: searchValue,
      result_limit: 8,
    });

    if (error) {
      console.error(error.message);
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setResults((data || []) as AddressLookup[]);
    setOpen(Boolean(data && data.length > 0));
    setLoading(false);
  }

  function selectAddress(address: AddressLookup) {
    onSelect({
      address: address.full_address,
      gnaf_pid: address.gnaf_pid,
      lat: address.latitude,
      lng: address.longitude,
    });

    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        className="input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
      />

      {loading && (
        <p className="mt-1 text-xs text-gray-500">Searching addresses...</p>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.map((address) => (
            <button
              key={address.id}
              type="button"
              onClick={() => selectAddress(address)}
              className="block w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-blue-50"
            >
              <p className="text-sm font-semibold text-gray-900">
                {address.full_address}
              </p>

              <p className="text-xs text-gray-500">
                {address.locality_name || ""} {address.state || ""}{" "}
                {address.postcode || ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}