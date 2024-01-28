import App from "./App";
import ReactDOM from "react-dom/client";
import { CssBaseline } from "@mui/joy";
import { CssVarsProvider } from "@mui/joy/styles";
import "@fontsource/inter";

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <CssVarsProvider defaultMode="system">
        <CssBaseline />
        <App />
    </CssVarsProvider>
);