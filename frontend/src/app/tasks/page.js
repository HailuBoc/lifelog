"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sun, Moon, Plus, Trash2, Edit2, Check, Calendar, AlertCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { store } from "@/lib/storage";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const priorityColors = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const statusColors = {
  pending: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "in-progress": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
};

const tabs = [
  { id: "pending", label: "Pending", icon: Circle },
  { id: "in-progress", label: "In Progress", icon: Clock },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function TasksPage() {
  const { user, token, loading: authLoading, logout } = useAuth(false);
  const router = useRouter();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [activeTab, setActiveTab] = useState("pending");
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });
  
  // Edit state
  const [editingTask, setEditingTask] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    dueDate: "",
  });

  // Load theme on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem("lifelog:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = storedTheme || (prefersDark ? "dark" : "light");
    setTheme(currentTheme);
    document.documentElement.classList.toggle("dark", currentTheme === "dark");
  }, []);

  // Fetch tasks - works for both logged in and guest users
  useEffect(() => {
    const loadTasks = async () => {
      if (user && token) {
        // Logged in user - fetch from API
        try {
          const response = await fetch(`${API_URL}/api/tasks`, {
            headers: { "Authorization": `Bearer ${token}` },
          });
          
          if (!response.ok) throw new Error("Failed to fetch tasks");
          
          const data = await response.json();
          setTasks(data.tasks || []);
        } catch (error) {
          console.error("Error fetching tasks:", error);
          // Fallback to local storage
          const localData = store.get(user?.id);
          if (localData?.tasks) {
            setTasks(localData.tasks);
          }
        }
      } else if (!authLoading) {
        // Guest user - load from local storage with guest key
        const localData = store.get("guest");
        if (localData?.tasks) {
          setTasks(localData.tasks);
        }
      }
      setLoading(false);
    };
    
    loadTasks();
  }, [user, token, authLoading]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch tasks");
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      // Load from local storage as fallback
      const localData = store.get(user?.id);
      if (localData?.tasks) {
        setTasks(localData.tasks);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    // Redirect to login if not authenticated
    if (!user || !token) {
      router.push(`/login?redirect=/tasks`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error("Failed to create task");
      
      const newTask = await response.json();
      setTasks((prev) => [newTask, ...prev]);
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
      });
      setShowForm(false);
      
      // Update local storage
      const localData = store.get(user?.id) || {};
      store.set(user?.id, { ...localData, tasks: [newTask, ...tasks] });
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId) => {
    // Redirect to login if not authenticated
    if (!user || !token) {
      router.push(`/login?redirect=/tasks`);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to delete task");
      
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      
      // Update local storage
      const localData = store.get(user?.id) || {};
      store.set(user?.id, { ...localData, tasks: tasks.filter((t) => t._id !== taskId) });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleToggle = async (taskId) => {
    // Redirect to login if not authenticated
    if (!user || !token) {
      router.push(`/login?redirect=/tasks`);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/toggle`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to toggle task");
      
      const updatedTask = await response.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updatedTask : t)));
      
      // Update local storage
      const localData = store.get(user?.id) || {};
      store.set(user?.id, { ...localData, tasks: tasks.map((t) => (t._id === taskId ? updatedTask : t)) });
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim()) return;
    
    // Redirect to login if not authenticated
    if (!user || !token) {
      router.push(`/login?redirect=/tasks`);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${editingTask._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });
      
      if (!response.ok) throw new Error("Failed to update task");
      
      const updatedTask = await response.json();
      setTasks((prev) => prev.map((t) => (t._id === editingTask._id ? updatedTask : t)));
      setEditingTask(null);
      
      // Update local storage
      const localData = store.get(user?.id) || {};
      store.set(user?.id, { ...localData, tasks: tasks.map((t) => (t._id === editingTask._id ? updatedTask : t)) });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === "completed") return false;
    return new Date(dueDate) < new Date();
  };

  const handleComplete = async (taskId) => {
    // Redirect to login if not authenticated
    if (!user || !token) {
      router.push(`/login?redirect=/tasks`);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed" }),
      });
      
      if (!response.ok) throw new Error("Failed to complete task");
      
      const updatedTask = await response.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updatedTask : t)));
      
      const localData = store.get(user?.id) || {};
      store.set(user?.id, { ...localData, tasks: tasks.map((t) => (t._id === taskId ? updatedTask : t)) });
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const filteredTasks = tasks.filter((task) => task.status === activeTab);
  const getTaskCount = (status) => tasks.filter((t) => t.status === status).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-sm bg-slate-900/50 border-b border-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-indigo-300 text-lg font-semibold hover:text-indigo-200">
              🧠Bruh LifeLog
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Title and Add Button */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">Tasks</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            {showForm ? "Cancel" : "Add Task"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = getTaskCount(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-700 text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add Task Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 bg-slate-800/60 border border-slate-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-slate-100">New Task</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {submitting ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        )}

        {/* Tasks Grid - 3 columns */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <p className="text-slate-400 text-lg mb-2">No {activeTab} tasks</p>
            <p className="text-slate-500 text-sm">
              {activeTab === "pending" && "Create a new task to get started!"}
              {activeTab === "in-progress" && "Start working on a pending task!"}
              {activeTab === "completed" && "Complete a task to see it here!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <div
                key={task._id}
                className={`bg-slate-800/60 border rounded-lg p-4 transition-all hover:scale-[1.02] hover:shadow-lg ${
                  task.status === "completed" ? "border-slate-700/50 opacity-75" : "border-slate-700"
                }`}
              >
                {editingTask?._id === task._id ? (
                  // Edit Form
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      required
                    />
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editFormData.priority}
                        onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                        className="px-2 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-100 text-xs"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <input
                        type="date"
                        value={editFormData.dueDate}
                        onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                        className="px-2 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-100 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTask(null)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // Task Card Display
                  <div className="h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3
                        className={`font-medium text-slate-100 line-clamp-2 ${
                          task.status === "completed" ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {task.title}
                      </h3>
                      
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(task._id)}
                          className="p-1 rounded-md hover:bg-rose-600/20 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className={`text-sm mb-3 line-clamp-3 ${task.status === "completed" ? "text-slate-500" : "text-slate-400"}`}>
                        {task.description}
                      </p>
                    )}
                    
                    <div className="mt-auto space-y-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${priorityColors[task.priority]}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                        
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 text-xs ${isOverdue(task.dueDate, task.status) ? "text-rose-400" : "text-slate-400"}`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                            {isOverdue(task.dueDate, task.status) && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                      
                      {/* Complete Button */}
                      {task.status !== "completed" && (
                        <button
                          onClick={() => handleComplete(task._id)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg transition-colors text-sm font-medium"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark Complete
                        </button>
                      )}
                      
                      {task.status === "completed" && (
                        <div className="w-full flex items-center justify-center gap-2 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
