import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import NewDubStep1 from './components/StepOne';
import NewDubStep2 from './components/StepTwo';
import NewDubStep3 from './components/StepThree';
import NewDubStep4 from './components/StepFour';
import VideoPreview from "./components/VideoPreview";
import LandingPage from "./components/LandingPage";
import AccountSettings from "./components/AccountSettings";
import Login from "./components/Login";
import SignUp from "./components/SignUp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-dub" element={<NewDubStep1 />} />
        <Route path="/new-dub/step-2" element={<NewDubStep2 />} />
        <Route path="/new-dub/step-3" element={<NewDubStep3 />} />
        <Route path="/new-dub/step-4" element={<NewDubStep4 />} />
        <Route path="/preview" element={<VideoPreview />} />
        <Route path="/account-settings" element={<AccountSettings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;