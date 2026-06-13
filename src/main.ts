import { mount } from 'svelte';
import './app.css';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import App from './App.svelte';

const target = document.getElementById('app');

if (!target) {
  throw new Error('App target not found.');
}

const app = mount(App, {
  target
});

export default app;