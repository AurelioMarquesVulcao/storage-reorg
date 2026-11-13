import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from '../shared/ui'
import Layout from './Layout'
import DuplicatesPage from '../modules/duplicates/pages/DuplicatesPage'
import OptimizePage from '../modules/optimize/pages/OptimizePage'
import ActionsPage from '../modules/actions/pages/ActionsPage'
import ProgressPage from '../modules/progress/pages/ProgressPage'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DuplicatesPage />} />
            <Route path="optimize" element={<OptimizePage />} />
            <Route path="actions" element={<ActionsPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
