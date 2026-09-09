import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Result } from "antd";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Top-level error boundary. Catches render/lifecycle errors anywhere below it and
// shows a recoverable fallback instead of a blank screen.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Swap for a real error reporter when one is added.
    console.error("Unhandled UI error:", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle={this.state.error.message}
          extra={[
            <Button key="retry" type="primary" onClick={this.handleReset}>
              Try again
            </Button>,
            <Button key="reload" onClick={() => window.location.reload()}>
              Reload
            </Button>,
          ]}
        />
      );
    }
    return this.props.children;
  }
}
