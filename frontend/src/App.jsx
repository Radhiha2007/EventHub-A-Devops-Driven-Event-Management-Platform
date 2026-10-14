import EventHubHome from "./components/eventhub/EventHubHome";
import { LoginScreen, SignupScreen } from "./components/eventhub/AuthScreens";
import RegistrationPage from "./RegistrationPage";

function App() {
  const path = window.location.pathname;

  if (path === "/login") return <LoginScreen />;
  if (path === "/signup") return <SignupScreen />;
  if (path === "/register") return <RegistrationPage />;

  return <EventHubHome />;
}

export default App;