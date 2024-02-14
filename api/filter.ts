export interface Filter {
  min?: number | bigint;
  max?: number | bigint;
  equal?: string | number | bigint;
  contains?: string | any[];
  objectFilter?: ObjectFilter;
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
  if (filter.contains) {
    if (!value.contains(filter.contains)) {
      return false;
    }
  }
  if (filter.objectFilter) {
    return passesObjectFilter(value, filter.objectFilter);
  }

  return true;
}

export function passesObjectFilter(object: any, objectFilter: ObjectFilter): boolean {
  Object.keys(objectFilter).forEach((property) => {
    if (!passesFilter(object[property], objectFilter[property])) {
      return false;
    }
  });

  return true;
}
