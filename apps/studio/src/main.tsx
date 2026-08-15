import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/studio.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('MindForge Studio: #root element not found');
}

createRoot(root).render(<App />);
