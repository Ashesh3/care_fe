import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { listFacilityAssetLocation } from "../../Redux/actions";
import AutocompleteFormField from "../Form/FormFields/Autocomplete";
import AutocompleteMultiSelectFormField from "../Form/FormFields/AutocompleteMultiselect";
interface LocationSelectProps {
  name: string;
  margin?: string;
  errors: string;
  className?: string;
  searchAll?: boolean;
  multiple?: boolean;
  facilityId: number;
  showAll?: boolean;
  selected: string | string[] | null;
  setSelected: (selected: string | string[] | null) => void;
}

export const LocationSelect = (props: LocationSelectProps) => {
  const {
    name,
    multiple,
    selected,
    setSelected,
    errors,
    className = "",
    facilityId,
  } = props;
  const [locations, setLocations] = useState<{ name: string; id: string }[]>(
    []
  );
  const dispatchAction: any = useDispatch();

  const handleValueChange = (current: string[]) => {
    if (multiple) setSelected(current);
    else setSelected([current ? current[0] : ""]);
  };

  useEffect(() => {
    dispatchAction(
      listFacilityAssetLocation({}, { facility_external_id: facilityId })
    ).then(({ data }: any) => {
      if (data.count > 0) {
        setLocations(data.results);
      }
    });
  }, [facilityId]);

  return props.multiple ? (
    <AutocompleteMultiSelectFormField
      name={name}
      value={selected as unknown as string[]}
      options={locations}
      onChange={({ value }) => handleValueChange(value as unknown as string[])}
      placeholder="Search by location name"
      optionLabel={(option) => option.name}
      optionValue={(option) => option.id}
      error={errors}
      className={className}
    />
  ) : (
    <AutocompleteFormField
      name={name}
      value={selected as string}
      options={locations}
      onChange={({ value }) => handleValueChange([value])}
      placeholder="Search by location name"
      optionLabel={(option) => option.name}
      optionValue={(option) => option.id}
      error={errors}
      className={className}
    />
  );
};
