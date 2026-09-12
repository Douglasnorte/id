import { useState } from 'react'
import Login from './components/Login'
import PontoTab from './components/ponto/PontoTab'
import EmployeesTab from './components/employees/EmployeesTab'
import { useAuth } from './hooks/useAuth'
import { useEmployees } from './hooks/useEmployees'
import { useTimeEvents } from './hooks/useTimeEvents'

type Tab = 'ponto' | 'colaboradores'

export default function App() {
  const { session, loading, signIn, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('ponto')

  const employeesState = useEmployees()
  const timeEventsState = useTimeEvents()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Carregando...</div>
  }

  if (!session) {
    return (
      <Login
        onSignIn={async (email, password) => {
          const err = await signIn(email, password)
          return err?.message
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg text-white">⏱</div>
            <span className="font-semibold text-slate-900">Ponto de Colaboradores</span>
          </div>

          <nav className="flex rounded-lg bg-slate-100 p-1 text-sm">
            <TabButton active={tab === 'ponto'} onClick={() => setTab('ponto')}>
              Registrar ponto
            </TabButton>
            <TabButton active={tab === 'colaboradores'} onClick={() => setTab('colaboradores')}>
              Colaboradores
            </TabButton>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{session.user.email}</span>
            <button onClick={signOut} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'ponto' ? (
          <PontoTab
            employees={employeesState.employees}
            eventsFor={timeEventsState.eventsFor}
            registerEvent={timeEventsState.registerEvent}
          />
        ) : (
          <EmployeesTab
            employees={employeesState.employees}
            createEmployee={employeesState.createEmployee}
            updateEmployee={employeesState.updateEmployee}
            setActive={employeesState.setActive}
          />
        )}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 font-medium transition ${
        active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
      }`}
    >
      {children}
    </button>
  )
}
