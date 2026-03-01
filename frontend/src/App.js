import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import NewDub from './components/NewDub';
import VideoPreview from "./components/VideoPreview";
import LoadingScreen from "./components/LoadingScreen";
import LandingPage from "./components/LandingPage";
import AccountSettings from "./components/AccountSettings";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import { isAuthenticated } from "./auth";

function PrivateRoute({ element }) {
  return isAuthenticated() ? element : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<PrivateRoute element={<Dashboard />} />} />
        <Route path="/new-dub" element={<PrivateRoute element={<NewDub />} />} />
        <Route path="/loading" element={<PrivateRoute element={<LoadingScreen />} />} />
        <Route path="/preview" element={<PrivateRoute element={<VideoPreview />} />} />
        <Route path="/account-settings" element={<PrivateRoute element={<AccountSettings />} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;