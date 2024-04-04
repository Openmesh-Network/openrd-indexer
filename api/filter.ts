export interface Filter {
  min?: number | bigint;
  max?: number | bigint;
  equal?: string | number | bigint;
  includes?: string | any;
  oneOf?: Filter[];
  not?: Filter;
  objectFilter?: ObjectFilter;

  convertValueToLowercase?: boolean;
}

export interface ObjectFilter {
  [property: string]: Filter;
}

function typeCheck(type: string, filterType: string) {
  if (filterType !== type) {
    throw new Error(`Type mismatch (filter: ${filterType}, value: ${type})`);
  }
}

export function passesFilter(value: any, filter: Filter): boolean {
  if (value === undefined) {
    return false;
  }
  if (filter.convertValueToLowercase) {
    if (typeof value === "string") {
      value = value.toLowerCase();
    } else {
      throw new Error(`ConvertValueToLowercase filter on non string value ${value}`);
    }
  }

  if (filter.min) {
    typeCheck(typeof value, typeof filter.min);
    if (value < filter.min) {
      return false;
    }
  }
  if (filter.max) {
    typeCheck(typeof value, typeof filter.max);
    if (value > filter.max) {
      return false;
    }
  }
  if (filter.equal) {
    typeCheck(typeof value, typeof filter.equal);
    if (value !== filter.equal) {
      return false;
    }
  }
  if (filter.includes) {
    if (!value.includes(filter.includes)) {
      return false;
    }
  }
  if (filter.oneOf) {
    if (!filter.oneOf.some((f) => passesFilter(value, f))) {
      return false;
    }
  }
  if (filter.not) {
    if (passesFilter(value, filter.not)) {
      return false;
    }
  }
  if (filter.objectFilter) {
    return passesObjectFilter(value, filter.objectFilter);
  }

  return true;
}

export function passesObjectFilter(object: any, objectFilter: ObjectFilter): boolean {
  const properties = Object.keys(objectFilter);
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (!passesFilter(object[property], objectFilter[property])) {
      return false;
    }
  }

  return true;
}
