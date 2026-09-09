import {createRoot} from 'react-dom/client';
import {App} from './app.jsx';
import './shared/preload.js';
import './styles.css';

createRoot(document.getElementById('root')).render(<App/>);
