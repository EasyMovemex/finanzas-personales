import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
export function chartTickColor() {
  return isDarkMode() ? '#6b6760' : '#a09c97';
}
export function chartGridColor() {
  return isDarkMode() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
}
