import { useState } from 'react';
import Studio from './components/Studio.jsx';
import GuestNudge from './components/GuestNudge.jsx';
import { ProjectProvider } from './state/ProjectContext.jsx';
import { SettingsProvider } from './state/SettingsContext.jsx';
import { AuthProvider, useAuth } from './state/AuthContext.jsx';
import NavBar from './components/NavBar.jsx';
import LoginModal from './components/LoginModal.jsx';
import RegisterModal from './components/RegisterModal.jsx';
import DashboardModal from './components/DashboardModal.jsx';
import Footer from './components/Footer.jsx';
import InstructionsModal from './components/InstructionsModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import './styles/tr808.css';
import './App.css';

function RouterView({ onOpenLogin, onOpenRegister }) {
	const { user } = useAuth();
	return (
		<>
			{!user && <GuestNudge onCreateAccount={onOpenRegister} />}
			<Studio />
		</>
	);
}

function Shell() {
	const [showInstructions, setShowInstructions] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showLogin, setShowLogin] = useState(false);
	const [showRegister, setShowRegister] = useState(false);
	const [showDashboard, setShowDashboard] = useState(
		typeof window !== 'undefined' && window.location.pathname === '/me'
	);

	const closeDashboard = () => {
		setShowDashboard(false);
		try {
			if (typeof window !== 'undefined' && window.location.pathname === '/me') {
				window.history.replaceState({}, '', '/');
			}
		} catch {}
	};

	return (
		<div className='appRoot'>
			<NavBar
				onOpenLogin={() => setShowLogin(true)}
				onOpenRegister={() => setShowRegister(true)}
				onOpenDashboard={() => setShowDashboard(true)}
				onOpenInstructions={() => setShowInstructions(true)}
				onOpenSettings={() => setShowSettings(true)}
			/>
			<div className='appContent'>
				<RouterView
					onOpenLogin={() => setShowLogin(true)}
					onOpenRegister={() => setShowRegister(true)}
				/>
			</div>
			<Footer />
			<InstructionsModal
				open={showInstructions}
				onClose={() => setShowInstructions(false)}
			/>
			<LoginModal
				open={showLogin}
				onClose={() => setShowLogin(false)}
				onSwitchToRegister={() => {
					setShowLogin(false);
					setShowRegister(true);
				}}
			/>
			<RegisterModal
				open={showRegister}
				onClose={() => setShowRegister(false)}
				onSwitchToLogin={() => {
					setShowRegister(false);
					setShowLogin(true);
				}}
			/>
			<DashboardModal
				open={showDashboard}
				onClose={closeDashboard}
			/>
			<SettingsModal
				open={showSettings}
				onClose={() => setShowSettings(false)}
			/>
		</div>
	);
}

export default function App() {
	return (
		<ProjectProvider>
			<SettingsProvider>
				<AuthProvider>
					<Shell />
				</AuthProvider>
			</SettingsProvider>
		</ProjectProvider>
	);
}
