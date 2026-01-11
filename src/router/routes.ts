import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('../game/ui/SplashScreen.vue') },
      { path: 'title', component: () => import('../game/ui/TitleScreen.vue') },
      { path: 'saves', component: () => import('../game/ui/SaveLoadScreen.vue') },
      { path: 'settings', component: () => import('../game/ui/SettingsScreen.vue') },
      { path: 'end', component: () => import('../game/ui/EndScreen.vue') },
      { path: 'demo', component: () => import('pages/DemoVN.vue') },
      { path: 'playground', component: () => import('pages/playground/Live2DViewer.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
