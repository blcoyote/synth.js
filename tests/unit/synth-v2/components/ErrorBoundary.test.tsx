/**
 * ErrorBoundary Component Tests
 * Tests error catching, display, and recovery functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../../../src/synth-v2/components/ErrorBoundary';

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console errors during tests (ErrorBoundary logs errors)
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display errors from child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
    });

    it('should display error title', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/🚨 Something went wrong/i)).toBeInTheDocument();
    });

    it('should display the error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
      expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
    });

    it('should show error details in a collapsible section', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const details = screen.getByText('Error Details');
      expect(details).toBeInTheDocument();
    });

    it('should provide a reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Page');
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton.tagName).toBe('BUTTON');
    });
  });

  describe('Error Recovery', () => {
    it('should not show error UI when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });

    it('should log error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should initialize with no error state', () => {
      const { container } = render(
        <ErrorBoundary>
          <div>Content</div>
        </ErrorBoundary>
      );

      // Should render children, not error UI
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(container.querySelector('[style*="linear-gradient"]')).not.toBeInTheDocument();
    });

    it('should update state when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error UI
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      // Should not show normal content
      expect(screen.queryByText('Normal content')).not.toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should use getDerivedStateFromError to set error state', () => {
      // This is tested implicitly by checking that error UI appears
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it('should call componentDidCatch with error info', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // componentDidCatch logs to console
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ErrorBoundary caught error'),
        expect.any(Error),
        expect.anything()
      );
    });
  });
});
