import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PinPage } from '@/features/auth/PinPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { NotFoundPage } from './NotFoundPage';

// Pages chargées à la demande : la visionneuse (three.js) n'est jamais
// téléchargée par l'écran de code PIN ni par la liste des projets.
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectLayout = lazy(() => import('@/features/projects/ProjectLayout').then((m) => ({ default: m.ProjectLayout })));
const ProjectOverview = lazy(() => import('@/features/projects/ProjectOverview').then((m) => ({ default: m.ProjectOverview })));
const ProjectDocuments = lazy(() => import('@/features/projects/ProjectDocuments').then((m) => ({ default: m.ProjectDocuments })));
const ProjectModels = lazy(() => import('@/features/projects/ProjectModels').then((m) => ({ default: m.ProjectModels })));
const ViewerPage = lazy(() => import('@/features/viewer/ViewerPage').then((m) => ({ default: m.ViewerPage })));

const page = (node: ReactNode) => <Suspense fallback={<div className="page" aria-busy="true" />}>{node}</Suspense>;
const guarded = (node: ReactNode) => <RequireAuth>{page(node)}</RequireAuth>;

export const router = createBrowserRouter([
  { path: '/', element: <PinPage /> },
  { path: '/projects', element: guarded(<ProjectsPage />) },
  {
    path: '/projects/:slug',
    element: guarded(<ProjectLayout />),
    children: [
      { index: true, element: page(<ProjectOverview />) },
      { path: 'documents', element: page(<ProjectDocuments />) },
      { path: 'modeles-3d', element: page(<ProjectModels />) },
      { path: '*', element: <Navigate to=".." replace /> },
    ],
  },
  { path: '/projets', element: <Navigate to="/projects" replace /> },
  { path: '/:slug', element: page(<ViewerPage />) },
  { path: '*', element: <NotFoundPage /> },
]);
