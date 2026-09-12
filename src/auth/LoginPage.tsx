import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { canUseAdminConsole } from "@/services/authService";
import { MESSAGES, ROUTES } from "@/utils/constants";

const { Title, Text } = Typography;

export function LoginPage() {
  const { isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || ROUTES.admin.dashboard} replace />;
  }

  const onFinish = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const signedIn = await login(email, password);
      if (!canUseAdminConsole(signedIn.roles)) {
        logout();
        setError(MESSAGES.auth.notAllowed);
        return;
      }
      navigate(location.state?.from?.pathname || ROUTES.admin.dashboard, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #1f1235 0%, #5b21b6 100%)",
        padding: 16,
      }}
    >
      <Card style={{ width: 380, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <SafetyCertificateOutlined style={{ fontSize: 32, color: "#5b21b6" }} />
          <Title level={3} style={{ marginTop: 8, marginBottom: 0 }}>
            StoryVerse Admin
          </Title>
          <Text type="secondary">Content review &amp; moderation console</Text>
        </div>

        {error ? (
          <Alert style={{ marginBottom: 16 }} type="error" showIcon message={error} />
        ) : null}

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Enter your email" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="you@example.com"
              autoComplete="username"
              data-testid="login-email"
            />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              autoComplete="current-password"
              data-testid="login-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              data-testid="login-submit"
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
