import '@fontsource/inter';

import ReactDOM from 'react-dom/client';

import { CssBaseline } from '@mui/joy';
import { CssVarsProvider } from '@mui/joy/styles';

import App from './App';
import Solver from './solver/Solver';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <CssVarsProvider defaultMode="system">
        <CssBaseline />
        {window.location.pathname === "/solver" && <Solver />}
        {window.location.pathname !== "/solver" && <App />}
    </CssVarsProvider>
);