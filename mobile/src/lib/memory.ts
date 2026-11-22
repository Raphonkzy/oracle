/** Small values remembered while the app is open. */
let lastAccountId: string | null = null;
export const getLastAccountId = () => lastAccountId;
export const setLastAccountId = (id: string | null) => {
  lastAccountId = id;
};
