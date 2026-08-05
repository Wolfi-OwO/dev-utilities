import { useState } from "react";
import {
  Upload,
  FileText,
  Download,
  X,
  ImageIcon,
  FileCode,
  GitBranch,
  Lock,
  LogOut,
  RefreshCw,
  Dot,
} from "lucide-react";

function IssueImporter() {
  const [gitlabToken, setGitlabToken] = useState("");
  const [gitlabUrl, setGitlabUrl] = useState("https://gitlab.com");
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [csvData, setCsvData] = useState([]);
  const [_selectedIssue, setSelectedIssue] = useState(null);
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [formData, setFormData] = useState({});
  const [images, setImages] = useState([]);

  // GitLab Authentication
  const handleGitLabAuth = async () => {
    if (!gitlabToken.trim()) {
      setError("Bitte gib einen GitLab Access Token ein");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${gitlabUrl}/api/v4/user`, {
        headers: {
          "PRIVATE-TOKEN": gitlabToken,
        },
      });

      if (response.ok) {
        setCurrentUser(await response.json());
        setIsAuthenticated(true);
        await loadProjects();
      } else {
        setError("Authentication fehlgeschlagen. Prüfe Token und URL.");
      }
    } catch (err) {
      setError("Verbindung zu GitLab fehlgeschlagen: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setGitlabToken("");
    setProjects([]);
    setSelectedProject(null);
    setError("");
  };

  // Load GitLab Projects
  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${gitlabUrl}/api/v4/projects?membership=true&per_page=100`,
        {
          headers: {
            "PRIVATE-TOKEN": gitlabToken,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0]);
        }
      } else {
        setError("Projekte konnten nicht geladen werden");
      }
    } catch (err) {
      setError("Fehler beim Laden der Projekte: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Import Issues from GitLab
  const importIssuesFromGitLab = async () => {
    if (!selectedProject) {
      setError("Bitte wähle ein Projekt aus");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${gitlabUrl}/api/v4/projects/${selectedProject.id}/issues?state=opened&per_page=100`,
        {
          headers: {
            "PRIVATE-TOKEN": gitlabToken,
          },
        }
      );

      if (response.ok) {
        const issues = await response.json();
        const formattedIssues = issues.map((issue, idx) => ({
          id: idx,
          title: issue.title,
          description: issue.description || "",
          type: issue.labels.some((l) => l.toLowerCase().includes("bug"))
            ? "bug"
            : "issue",
          due_date: issue.due_date || "",
          labels: issue.labels.join(", "),
          assignee: issue.assignees.map((a) => a.name).join(", "),
        }));
        setCsvData(formattedIssues);
      } else {
        setError("Issues konnten nicht geladen werden");
      }
    } catch (err) {
      setError("Fehler beim Importieren der Issues: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create Issue in GitLab
  const createIssueInGitLab = async () => {
    if (!selectedProject) {
      setError("Bitte wähle ein Projekt aus");
      return;
    }

    if (!formData.title) {
      setError("Titel ist erforderlich");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const markdown = generateMarkdown();

      const response = await fetch(
        `${gitlabUrl}/api/v4/projects/${selectedProject.id}/issues`,
        {
          method: "POST",
          headers: {
            "PRIVATE-TOKEN": gitlabToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formData.title,
            description: markdown,
            labels: selectedTemplate,
          }),
        }
      );

      if (response.ok) {
        const issue = await response.json();
        alert(`Issue erfolgreich erstellt!\nURL: ${issue.web_url}`);
        // Reset form
        setFormData({});
        setImages([]);
      } else {
        const errorData = await response.json();
        setError(
          "Issue konnte nicht erstellt werden: " +
            (errorData.message || "Unbekannter Fehler")
        );
      }
    } catch (err) {
      setError("Fehler beim Erstellen des Issues: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateUpload = (e) => {
    const files = Array.from(e.target.files);
    const newTemplates = {};

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const fileName = file.name.replace(".md", "");
        newTemplates[fileName] = {
          name: fileName,
          content: content,
          fields: extractFieldsFromTemplate(content),
        };
        setTemplates((prev) => ({ ...prev, ...newTemplates }));
        if (!selectedTemplate) {
          setSelectedTemplate(fileName);
        }
      };
      reader.readAsText(file);
    });
  };

  const extractFieldsFromTemplate = (content) => {
    const fields = [];
    const lines = content.split("\n");

    fields.push({
      key: "title",
      label: "Titel",
      type: "text",
      required: true,
      section: "title",
    });

    let currentSection = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("## ") && !line.includes("Akzeptanzkriterien")) {
        currentSection = line.replace("## ", "").trim();
        const key = currentSection
          .toLowerCase()
          .replace(/ä/g, "ae")
          .replace(/ö/g, "oe")
          .replace(/ü/g, "ue")
          .replace(/ß/g, "ss")
          .replace(/[^a-z0-9]/g, "_");

        let nextLine = lines[i + 1]?.trim() || "";
        let isLongText = !nextLine.startsWith("-") && !nextLine.startsWith("*");

        fields.push({
          key: key,
          label: currentSection,
          type: isLongText ? "textarea" : "textarea",
          section: currentSection,
        });
      }
    }

    return fields;
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        parseCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    const data = lines.slice(1).map((line, idx) => {
      const values = [];
      let current = "";
      let inQuotes = false;

      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const obj = { id: idx };
      headers.forEach((header, i) => {
        obj[header] = values[i]?.replace(/"/g, "") || "";
      });
      return obj;
    });

    setCsvData(data);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages((prev) => [
          ...prev,
          { name: file.name, data: event.target.result },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const generateMarkdown = () => {
    if (!selectedTemplate || !templates[selectedTemplate]) return "";

    const template = templates[selectedTemplate];
    let md = template.content;

    const titleMatch = md.match(/^#\s+.+$/m);
    if (titleMatch) {
      md = md.replace(
        titleMatch[0],
        `# ${template.name}\n\n**${formData.title || "Titel"}**`
      );
    }

    template.fields.forEach((field) => {
      if (field.key === "title") return;
      const value = formData[field.key] || "";

      if (value) {
        const sectionRegex = new RegExp(
          `(## ${field.label}\\s*\\n)(.*?)(?=\\n## |\\n/label|$)`,
          "s"
        );
        if (md.match(sectionRegex)) {
          md = md.replace(sectionRegex, `$1\n${value}\n`);
        }
      }
    });

    if (images.length > 0) {
      const imageSection = `\n## Screenshots / Bilder\n\n${images
        .map((img) => `![${img.name}](${img.data})`)
        .join("\n\n")}\n`;
      if (md.includes("/label")) {
        md = md.replace(/\/label/, imageSection + "\n/label");
      } else {
        md += imageSection;
      }
    }

    return md;
  };

  const downloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      formData.title?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "issue"
    }.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromCSV = (issue) => {
    const tpl = templates[selectedTemplate];
    if (!tpl || !tpl.fields) return;

    const newFormData = {};

    tpl.fields.forEach((field) => {
      const key = field.key;

      // Exact match: only when the CSV header is identical, character for character
      newFormData[key] = issue[key] !== undefined ? issue[key] : "";
    });

    newFormData.title = issue.title || "";

    setSelectedIssue(issue);
    setFormData(newFormData);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-6">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h1 className="text-3xl font-bold text-white mb-2">
              GitLab Authentication
            </h1>
            <p className="text-gray-200">
              Verbinde dich mit deinem GitLab Account
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                GitLab URL
              </label>
              <input
                type="text"
                value={gitlabUrl}
                onChange={(e) => setGitlabUrl(e.target.value)}
                placeholder="https://gitlab.com"
                className="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Personal Access Token
              </label>
              <input
                type="password"
                value={gitlabToken}
                onChange={(e) => setGitlabToken(e.target.value)}
                placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <p className="text-xs text-gray-300 mt-2">
                Erstelle einen Token unter: Settings → Access Tokens (Scope:
                api)
              </p>
            </div>

            <button
              onClick={handleGitLabAuth}
              disabled={loading}
              className="w-full bg-gradient-to-r from-gray-600 to-pink-600 hover:from-gray-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            >
              <Lock className="w-5 h-5" />
              {loading ? "Verbinde..." : "Mit GitLab verbinden"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <FileText className="w-10 h-10" />
                GitLab Issue Generator
              </h1>
              <div className="flex items-center text-gray-200">
                <span>Verbunden mit GitLab</span>
                <Dot />
                <span>{projects.length} Projekte geladen</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-red-500/30"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
              <img
                src={currentUser.avatar_url}
                alt="User Avatar"
                className="w-10 h-10 rounded-full"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* GitLab Project Selection */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                GitLab Projekt
              </h2>

              <select
                value={selectedProject?.id || ""}
                onChange={(e) =>
                  setSelectedProject(
                    projects.find((p) => p.id === parseInt(e.target.value))
                  )
                }
                className="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                    className="bg-slate-800"
                  >
                    {project.name}
                  </option>
                ))}
              </select>

              <button
                onClick={importIssuesFromGitLab}
                disabled={loading || !selectedProject}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                />
                Issues importieren
              </button>
            </div>

            {/* Template Upload */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Template Upload
              </h2>

              <label className="block">
                <div className="border-2 border-dashed border-gray-400/50 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors bg-white/5">
                  <FileCode className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <span className="text-sm text-gray-200">
                    Markdown Templates (.md)
                  </span>
                  <input
                    type="file"
                    accept=".md"
                    multiple
                    onChange={handleTemplateUpload}
                    className="hidden"
                  />
                </div>
              </label>

              {Object.keys(templates).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-200 font-semibold">
                    {Object.keys(templates).length} Templates:
                  </p>
                  {Object.entries(templates).map(([key, tpl]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTemplate(key)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTemplate === key
                          ? "bg-gray-500/30 border-gray-400"
                          : "bg-white/5 hover:bg-white/10 border-white/10"
                      }`}
                    >
                      <div className="font-medium text-white text-sm">
                        {tpl.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CSV Import */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                CSV Import
              </h2>

              <label className="block">
                <div className="border-2 border-dashed border-gray-400/50 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors bg-white/5">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <span className="text-sm text-gray-200">CSV Datei</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </div>
              </label>

              {csvData.length > 0 && (
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-sm text-gray-200 font-semibold">
                    {csvData.length} Issues:
                  </p>
                  {csvData.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => loadFromCSV(issue)}
                      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                    >
                      <div className="font-medium text-white text-sm truncate">
                        {issue.title}
                      </div>
                      {issue.type && (
                        <div className="text-xs text-gray-300 mt-1">
                          <span className="bg-gray-500/30 px-2 py-0.5 rounded">
                            {issue.type}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="lg:col-span-2">
            {Object.keys(templates).length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-12 text-center">
                <FileCode className="w-16 h-16 mx-auto mb-4 text-gray-300 opacity-50" />
                <h3 className="text-2xl font-semibold text-white mb-2">
                  Keine Templates geladen
                </h3>
                <p className="text-gray-200">
                  Bitte lade zuerst mindestens eine .md Template-Datei hoch
                </p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    Issue Formular
                  </h2>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    {Object.entries(templates).map(([key, tpl]) => (
                      <option key={key} value={key} className="bg-slate-800">
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {templates[selectedTemplate]?.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        {field.label}{" "}
                        {field.required && (
                          <span className="text-red-400">*</span>
                        )}
                      </label>

                      {field.type === "text" && (
                        <input
                          type="text"
                          value={formData[field.key] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [field.key]: e.target.value,
                            })
                          }
                          className="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          value={formData[field.key] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [field.key]: e.target.value,
                            })
                          }
                          rows={4}
                          className="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-y"
                        />
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Screenshots / Bilder
                    </label>
                    <label className="block">
                      <div className="border-2 border-dashed border-gray-400/50 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors bg-white/5">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                        <span className="text-sm text-gray-200">
                          Bilder hinzufügen
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </label>

                    {images.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10"
                          >
                            <span className="text-sm text-white truncate flex-1">
                              {img.name}
                            </span>
                            <button
                              onClick={() => removeImage(idx)}
                              className="text-red-400 hover:text-red-300 ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={createIssueInGitLab}
                    disabled={!formData.title || loading || !selectedProject}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
                  >
                    <GitBranch className="w-5 h-5" />
                    In GitLab erstellen
                  </button>
                  <button
                    onClick={downloadMarkdown}
                    disabled={!formData.title}
                    className="flex-1 bg-gradient-to-r from-gray-600 to-pink-600 hover:from-gray-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5" />
                    Als Markdown
                  </button>
                </div>
              </div>
            )}

            {formData.title && selectedTemplate && (
              <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Vorschau
                </h3>
                <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-100 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {generateMarkdown()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IssueImporter;
