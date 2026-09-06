import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Modules from './pages/Modules'
import Notes from './pages/Notes'
import NoteDetail from './pages/NoteDetail'
import NoteEdit from './pages/NoteEdit'
import Settings from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="modules" element={<Modules />} />
          <Route path="notes" element={<Notes />} />
          <Route path="notes/new" element={<NoteEdit />} />
          <Route path="notes/:id" element={<NoteDetail />} />
          <Route path="notes/:id/edit" element={<NoteEdit />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App