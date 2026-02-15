"use client";

import { useState, useEffect } from "react";
import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, loading } = useAuth(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState({
    totalJournalEntries: 0,
    completedHabits: 0,
    currentStreak: 0,
    totalTasks: 0
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Fetch stats data
  useEffect(() => {
    if (!token) return;
    
    const fetchStats = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        
        // Fetch journals
        const journalRes = await fetch(`${API_URL}/api/lifelog/journal`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const journalData = await journalRes.json();
        
        // Fetch habits
        const habitRes = await fetch(`${API_URL}/api/lifelog/habit`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const habitData = await habitRes.json();
        
        // Fetch tasks
        const taskRes = await fetch(`${API_URL}/api/tasks`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const taskData = await taskRes.json();
        
        // Calculate stats
        const totalJournalEntries = journalData.length || 0;
        const completedHabits = habitData.filter(h => h.completed).length || 0;
        const currentStreak = calculateStreak(habitData);
        const totalTasks = taskData.length || 0;
        
        setStats({
          totalJournalEntries,
          completedHabits,
          currentStreak,
          totalTasks
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    
    fetchStats();
  }, [token]);

  const calculateStreak = (habits) => {
    // Simple streak calculation - count consecutive days with completed habits
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasCompletedHabit = habits.some(h => 
        h.completed && h.date && h.date.startsWith(dateStr)
      );
      
      if (hasCompletedHabit) {
        streak++;
      } else if (i > 0) {
        break; // Break if streak is broken (but allow today to be incomplete)
      }
    }
    
    return streak;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      announce("Name is required");
      return;
    }

    if (formData.email && !formData.email.includes("@")) {
      announce("Please enter a valid email");
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      announce("Passwords do not match");
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      // Update profile
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      // Update password if provided
      if (formData.currentPassword && formData.newPassword) {
        const passwordRes = await fetch(`${API_URL}/api/user/password`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
          })
        });

        if (!passwordRes.ok) {
          throw new Error("Failed to update password");
        }
      }

      announce("Profile updated successfully!");
      setEditMode(false);
      setFormData({
        name: "",
        email: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      announce("Failed to update profile. Please try again.");
    }
  };

  const announce = (message) => {
    // Simple announcement - in real app you might use toast notifications
    alert(message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
              <p className="text-slate-400 mt-1">Manage your account settings</p>
            </div>
            <Link
              href="/"
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        {/* Profile Content */}
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-medium text-slate-300">Personal Information</div>
              <button
                onClick={() => setEditMode(!editMode)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                {editMode ? "Cancel" : "Edit"}
              </button>
            </div>

            {editMode ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/40 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/40 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                      <div className="text-slate-100">{user?.name || "Not set"}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                      <div className="text-slate-100">{user?.email || "Not set"}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Account Status</label>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="text-emerald-400">Active</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Member Since</label>
                      <div className="text-slate-100">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-medium text-slate-300 mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Tasks</span>
                        <span className="text-slate-100 font-medium">{stats.totalTasks}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Journal Entries</span>
                        <span className="text-slate-100 font-medium">{stats.totalJournalEntries}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Completed Habits</span>
                        <span className="text-slate-100 font-medium">{stats.completedHabits}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Current Streak</span>
                        <span className="text-slate-100 font-medium">{stats.currentStreak} days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
