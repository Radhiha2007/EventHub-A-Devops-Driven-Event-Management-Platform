import EventHubHome from "./components/eventhub/EventHubHome";
import { LoginScreen, SignupScreen } from "./components/eventhub/AuthScreens";

function App() {
  const path = window.location.pathname;

  if (path === "/login") return <LoginScreen />;
  if (path === "/signup") return <SignupScreen />;

  return <EventHubHome />;
}

export default App;
