import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms/Button.js';
import { Input } from '../atoms/Input.js';
import { FeedbackButtons } from '../molecules/FeedbackButtons.js';
import { ChatPanelShell } from './ChatPanelShell.js';

const meta: Meta<typeof ChatPanelShell> = {
  component: ChatPanelShell,
  title: 'Organisms/ChatPanelShell',
};
export default meta;

type Story = StoryObj<typeof ChatPanelShell>;

export const Default: Story = {
  render: () => (
    <div className="h-96 w-96">
      <ChatPanelShell
        title="Ask about your quote"
        onClose={() => undefined}
        inputRow={
          <div className="flex gap-2">
            <Input
              placeholder="Why did my premium change?"
              className="flex-1"
            />
            <Button size="sm">Send</Button>
          </div>
        }
      >
        <div className="flex justify-end">
          <div className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
            Why did my premium change?
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
            Your premium increased because the MVR report found one violation.
          </div>
          <FeedbackButtons value={null} onChange={() => undefined} />
        </div>
      </ChatPanelShell>
    </div>
  ),
};
