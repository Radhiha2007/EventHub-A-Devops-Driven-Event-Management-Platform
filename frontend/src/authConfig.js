export const msalConfig = {
  auth: {
    clientId: "abda3b2e-63fc-465c-87be-20c4b8d86ec4",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "http://localhost:5173",
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email","api://0be8884f-4a48-47e1-ba49-80770c4debc7/access_as_user"
],
};
