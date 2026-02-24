import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="mb-2 text-5xl font-bold text-slate-800">404</h1>
        <p className="mb-6 text-slate-600">页面未找到</p>
        <Link to="/">
          <Button>返回首页</Button>
        </Link>
      </div>
    </div>
  );
}
