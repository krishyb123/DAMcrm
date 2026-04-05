import { styled } from '@linaria/react';
import { useState, useEffect, useCallback } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useAuth } from '@/auth/hooks/useAuth';

const StyledOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const StyledModal = styled.div`
  background: ${themeCssVariables.background.primary};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const StyledHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[6]};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
`;

const StyledTitle = styled.h3`
  margin: 0;
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  color: ${themeCssVariables.font.color.primary};
`;

const StyledCloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: ${themeCssVariables.font.color.tertiary};
  padding: 4px;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledBody = styled.div`
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[6]};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  overflow-y: auto;
`;

const StyledFieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLabel = styled.label`
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledInput = styled.input`
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  font-size: ${themeCssVariables.font.size.md};
  color: ${themeCssVariables.font.color.primary};
  background: ${themeCssVariables.background.primary};
  outline: none;

  &:focus {
    border-color: ${themeCssVariables.color.blue};
  }
`;

const StyledTextarea = styled.textarea`
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  font-size: ${themeCssVariables.font.size.md};
  color: ${themeCssVariables.font.color.primary};
  background: ${themeCssVariables.background.primary};
  outline: none;
  min-height: 200px;
  resize: vertical;
  font-family: inherit;

  &:focus {
    border-color: ${themeCssVariables.color.blue};
  }
`;

const StyledFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[6]};
  border-top: 1px solid ${themeCssVariables.border.color.medium};
`;

const StyledButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
  border-radius: ${themeCssVariables.border.radius.sm};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  cursor: pointer;
  border: 1px solid ${themeCssVariables.border.color.medium};
  background: ${(props) =>
    props.variant === 'primary'
      ? themeCssVariables.color.blue
      : themeCssVariables.background.primary};
  color: ${(props) =>
    props.variant === 'primary'
      ? '#ffffff'
      : themeCssVariables.font.color.primary};

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StyledStatusMessage = styled.div<{ isError?: boolean }>`
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  border-radius: ${themeCssVariables.border.radius.sm};
  font-size: ${themeCssVariables.font.size.sm};
  background: ${(props) => (props.isError ? '#fef2f2' : '#f0fdf4')};
  color: ${(props) => (props.isError ? '#dc2626' : '#16a34a')};
`;

type ConnectedAccount = {
  id: string;
  handle: string;
  provider: string;
};

type ComposeEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
};

export const ComposeEmailModal = ({
  isOpen,
  onClose,
  defaultTo = '',
  defaultSubject = '',
}: ComposeEmailModalProps) => {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState<
    ConnectedAccount[]
  >([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody('');
      setCc('');
      setBcc('');
      setStatusMessage('');
      setIsError(false);
      fetchConnectedAccounts();
    }
  }, [isOpen, defaultTo, defaultSubject]);

  const fetchConnectedAccounts = useCallback(async () => {
    try {
      const response = await fetch('/rest/email/connected-accounts', {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const accounts = result.data || [];

        setConnectedAccounts(accounts);

        if (accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accounts[0].id);
        }
      }
    } catch {
      setStatusMessage('Failed to load connected accounts');
      setIsError(true);
    }
  }, [selectedAccountId]);

  const getAuthToken = (): string => {
    const tokenPair = localStorage.getItem('tokenPair');

    if (tokenPair) {
      try {
        const parsed = JSON.parse(tokenPair);

        return parsed.accessToken?.token || '';
      } catch {
        return '';
      }
    }

    return '';
  };

  const handleSend = async () => {
    if (!to || !selectedAccountId) return;

    setSending(true);
    setStatusMessage('');

    try {
      const response = await fetch('/rest/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          connectedAccountId: selectedAccountId,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          body,
        }),
      });

      if (response.ok) {
        setStatusMessage('Email sent successfully!');
        setIsError(false);
        setTimeout(onClose, 1500);
      } else {
        const error = await response.json();

        setStatusMessage(error.message || 'Failed to send email');
        setIsError(true);
      }
    } catch {
      setStatusMessage('Network error — could not send email');
      setIsError(true);
    } finally {
      setSending(false);
    }
  };

  const handleDraft = async () => {
    if (!to || !selectedAccountId) return;

    setSending(true);
    setStatusMessage('');

    try {
      const response = await fetch('/rest/email/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          connectedAccountId: selectedAccountId,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          body,
        }),
      });

      if (response.ok) {
        setStatusMessage('Draft created in Gmail!');
        setIsError(false);
        setTimeout(onClose, 1500);
      } else {
        const error = await response.json();

        setStatusMessage(error.message || 'Failed to create draft');
        setIsError(true);
      }
    } catch {
      setStatusMessage('Network error — could not create draft');
      setIsError(true);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <StyledOverlay onClick={onClose}>
      <StyledModal onClick={(e) => e.stopPropagation()}>
        <StyledHeader>
          <StyledTitle>
            <Trans>Compose Email</Trans>
          </StyledTitle>
          <StyledCloseButton onClick={onClose}>×</StyledCloseButton>
        </StyledHeader>

        <StyledBody>
          {connectedAccounts.length > 1 && (
            <StyledFieldRow>
              <StyledLabel>
                <Trans>From</Trans>
              </StyledLabel>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                }}
              >
                {connectedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.handle}
                  </option>
                ))}
              </select>
            </StyledFieldRow>
          )}

          {connectedAccounts.length === 1 && (
            <StyledFieldRow>
              <StyledLabel>
                <Trans>From</Trans>
              </StyledLabel>
              <StyledInput value={connectedAccounts[0].handle} disabled />
            </StyledFieldRow>
          )}

          {connectedAccounts.length === 0 && (
            <StyledStatusMessage isError>
              <Trans>
                No connected email accounts. Go to Settings → Accounts to
                connect one.
              </Trans>
            </StyledStatusMessage>
          )}

          <StyledFieldRow>
            <StyledLabel>
              <Trans>To</Trans>
            </StyledLabel>
            <StyledInput
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </StyledFieldRow>

          <StyledFieldRow>
            <StyledLabel>
              <Trans>CC</Trans>
            </StyledLabel>
            <StyledInput
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
            />
          </StyledFieldRow>

          <StyledFieldRow>
            <StyledLabel>
              <Trans>Subject</Trans>
            </StyledLabel>
            <StyledInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </StyledFieldRow>

          <StyledFieldRow>
            <StyledLabel>
              <Trans>Message</Trans>
            </StyledLabel>
            <StyledTextarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..."
            />
          </StyledFieldRow>

          {statusMessage && (
            <StyledStatusMessage isError={isError}>
              {statusMessage}
            </StyledStatusMessage>
          )}
        </StyledBody>

        <StyledFooter>
          <StyledButton onClick={onClose}>
            <Trans>Cancel</Trans>
          </StyledButton>
          <StyledButton
            onClick={handleDraft}
            disabled={!to || !selectedAccountId || sending}
          >
            <Trans>Save Draft</Trans>
          </StyledButton>
          <StyledButton
            variant="primary"
            onClick={handleSend}
            disabled={!to || !selectedAccountId || sending}
          >
            {sending ? <Trans>Sending...</Trans> : <Trans>Send</Trans>}
          </StyledButton>
        </StyledFooter>
      </StyledModal>
    </StyledOverlay>
  );
};
