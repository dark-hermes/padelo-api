export function applyCreatedBy<T extends Record<string, any>>(
  data: T,
  userId: string,
) {
  return {
    ...data,
    createdById: userId,
    updatedById: userId,
  } as T & { createdById: string; updatedById: string };
}

export function applyUpdatedBy<T extends Record<string, any>>(
  data: T,
  userId: string,
) {
  return {
    ...data,
    updatedById: userId,
  } as T & { updatedById: string };
}
