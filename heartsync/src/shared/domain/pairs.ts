export function canonicalUserPair(userA: string, userB: string) {
  if (!userA || !userB || userA === userB) return null;
  return userA < userB ? [userA, userB] as const : [userB, userA] as const;
}
