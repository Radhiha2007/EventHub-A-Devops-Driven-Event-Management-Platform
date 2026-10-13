
import { useEffect, useState } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

import api from "./services/api";
import { loginRequest } from "./authConfig";

function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [profile, setProfile] = useState(null);
  const [authStatus, setAuthStatus] = useState("Not checked");

  useEffect(() => {
    api
      .get("/health")
      .then((response) => {
        setBackendStatus(response.data.status);
      })
      .catch(() => {
        setBackendStatus("Backend unavailable");
      });
  }, []);

  const handleLogin = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Microsoft login failed:", error);
    }
  };

  const handleCheckProfile = async () => {
    const account = accounts[0];

    if (!account) {
      setAuthStatus("No Microsoft account found. Please sign in.");
      return;
    }

    setAuthStatus("Checking...");
    setProfile(null);

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });

      const response = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });

      setProfile(response.data);
      setAuthStatus("Access token accepted by backend");
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({
          ...loginRequest,
          account,
        });
        return;
      }

      if (error.response?.status === 401) {
        setAuthStatus(
          "Backend rejected the token. Check the API token configuration."
        );
      } else if (error.response?.status === 403) {
        setAuthStatus(
          "Token lacks the required API scope."
        );
      } else {
        setAuthStatus(
          "Could not verify the profile. Check the backend connection and logs."
        );
      }

      console.error("Profile verification failed:", error.message);
    }
  };

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div>
      <h1>EventHub</h1>

      <p>Backend status: {backendStatus}</p>

      {!isAuthenticated ? (
        <button onClick={handleLogin}>
          Sign in with Microsoft
        </button>
      ) : (
        <div>
          <p>
            Signed in as:{" "}
            {accounts[0]?.name || accounts[0]?.username}
          </p>

          <button onClick={handleCheckProfile}>
            Verify Backend Authentication
          </button>

          <p>Authentication status: {authStatus}</p>

          {profile && (
            <div>
              <h2>Verified Backend Profile</h2>
              <p>Name: {profile.name || "Not provided"}</p>
              <p>Username: {profile.username || "Not provided"}</p>
              <p>User ID: {profile.user_id || "Not provided"}</p>
              <p>Scopes: {profile.scopes.join(", ") || "None"}</p>
            </div>
          )}

          <button onClick={handleLogout}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export default App;
