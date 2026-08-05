import { AlertTriangle } from "lucide-react";

function NotFoundPage({
  errorMessage = "Die angeforderte Seite konnte nicht gefunden werden.",
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500" />
        </div>

        <h1 className="text-5xl font-extrabold text-gray-800">404</h1>

        <p className="text-lg text-gray-600">{errorMessage}</p>

        <a
          href="/"
          className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
        >
          Zurück zur Startseite
        </a>
      </div>
    </div>
  );
}

export default NotFoundPage;
