import { useNavigate } from "react-router-dom";
import { Button, Result } from "antd";
import { ROUTES } from "@/utils/constants";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="This page does not exist."
      extra={
        <Button type="primary" onClick={() => navigate(ROUTES.home)}>
          Back to home
        </Button>
      }
    />
  );
}
