import { createBrowserRouter } from "react-router-dom";

import IssueImporter from "./pages/import-page/import-page.jsx";
import NotFoundPage from "./pages/not-found-page/not-found-page.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <NotFoundPage />,
    element: <IssueImporter />,
  },
  
]);

export default router;
