import React, { useState, useEffect } from "react";
import {
  LightGlobalDhcpConfigDto,
  LightIpSpaceDto,
  LightAddressBlockDto,
  LightSubnetDto,
  LightRangeDto,
  LightFixedAddressDto,
} from "@/types/dto/dhcp-light-tree.dto";
import { TreeSelection } from "../../types/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import DhcpOptionsPanel from "./DhcpOptionsPanel";
import { fetchEffectiveDhcpOptions } from "@/services/dhcp-options.service";
import { EffectiveDhcpOptionSlimDto } from "@/types/dto/effective-dhcp-option-slim.dto";

// Field mapping for each object type
type PropertyDef<T> = {
  label: string;
  prop: keyof T;
};

// Defines which fields to display per node type
const FIELD_CONFIG = {
  global: [
    { label: "Comment", prop: "comment" },
  ] as PropertyDef<LightGlobalDhcpConfigDto>[],
  ipSpace: [
    { label: "Name", prop: "name" },
    { label: "Comment", prop: "comment" },
  ] as PropertyDef<LightIpSpaceDto>[],
  addressBlock: [
    { label: "Name", prop: "name" },
    { label: "Address", prop: "address" },
    { label: "CIDR", prop: "cidr" },
    { label: "Comment", prop: "comment" },
  ] as PropertyDef<LightAddressBlockDto>[],
  subnet: [
    { label: "Name", prop: "name" },
    { label: "Address", prop: "address" },
    { label: "CIDR", prop: "cidr" },
    { label: "Comment", prop: "comment" },
  ] as PropertyDef<LightSubnetDto>[],
  range: [
    { label: "Name", prop: "name" },
    { label: "Start IP", prop: "start" },
    { label: "End IP", prop: "end" },
    { label: "Comment", prop: "comment" },
  ] as PropertyDef<LightRangeDto>[],
  fixedAddress: [
    { label: "Name", prop: "name" },
    { label: "IP Address", prop: "ip" },
    { label: "Type", prop: "type" },
    { label: "MAC Address", prop: "mac" },
    { label: "Comment", prop: "comment" },
  ] as PropertyDef<LightFixedAddressDto>[],
} as const;

export const DhcpPropertiesPanel: React.FC<{ selected: TreeSelection | null }> = ({
  selected,
}) => {
  const [tab, setTab] = useState("properties");
  const [options, setOptions] = useState<EffectiveDhcpOptionSlimDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load DHCP options when switching to the "Options" tab
  useEffect(() => {
    if (!selected || tab !== "options") return;
    setLoading(true);
    setError(null);
    setOptions(null);

    fetchEffectiveDhcpOptions(selected.type, selected.object.id)
      .then(setOptions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selected, tab]);

  // Reset options when a new node is selected
  useEffect(() => {
    setOptions(null);
    setError(null);
    setLoading(false);
  }, [selected]);

  // If nothing is selected, show placeholder
  if (!selected) {
    return (
      <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-6 shadow-sm min-h-[120px] mb-4 flex items-center justify-center text-gray-400">
        Please select an object…
      </div>
    );
  }

  const { type, object } = selected;
  const fields = FIELD_CONFIG[type];

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="properties">Properties</TabsTrigger>
        <TabsTrigger value="options">Options</TabsTrigger>
      </TabsList>
      <TabsContent value="properties">
        <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-6 shadow-sm min-h-[120px] mb-4">
          <h2 className="font-bold text-2xl mb-4 tracking-wide">
            {type === "global"
              ? "Global DHCP Configuration"
              : type === "ipSpace"
              ? "IP Space"
              : type === "addressBlock"
              ? "Address Block"
              : type === "subnet"
              ? "Subnet"
              : type === "range"
              ? "Range"
              : type === "fixedAddress"
              ? "Fixed Address"
              : type}
          </h2>
          <table className="w-full text-left text-base border-separate border-spacing-y-2">
            <tbody>
              {fields.map(({ label, prop }) => {
                // Dynamically extract property value for display
                // @ts-expect-error: prop type inference is not strict here
                const value = object[prop];
                const display =
                  value === null ||
                  value === undefined ||
                  (typeof value === "string" && value.trim() === "")
                    ? "–"
                    : String(value);
                return (
                  <tr key={String(prop)}>
                    <td className="font-semibold text-gray-400">{label}</td>
                    <td className="break-all">{display}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TabsContent>
      <TabsContent value="options">
        <DhcpOptionsPanel loading={loading} options={options} error={error} />
      </TabsContent>
    </Tabs>
  );
};

export default DhcpPropertiesPanel;
