import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

interface OutputCardProps {
  hook?: string
  body?: string
  cta?: string
  imageDirection?: string
  onApprove?: () => void
  isApproved?: boolean
}

export function OutputCard({ hook, body, cta, imageDirection, onApprove, isApproved }: OutputCardProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const renderSection = (title: string, content: string | undefined, contentClassName: string, sectionKey: string) => {
    if (!content) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-border-subtle pb-1">
          <span className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest">
            {title}
          </span>
          <button
            onClick={() => handleCopy(content, sectionKey)}
            className="flex items-center gap-1.5 text-[10px] font-ui text-text-muted hover:text-text-primary transition-colors"
          >
            {copiedSection === sectionKey ? (
              <Check className="h-3 w-3 text-status-green" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copiedSection === sectionKey ? 'COPIED' : `COPY ${title}`}
          </button>
        </div>
        <div className={cn("text-xs font-body leading-relaxed", contentClassName)}>
          {content}
        </div>
      </div>
    )
  }

  return (
    <Card className="bg-bg-surface border-border-default">
      <CardContent className="p-5 space-y-5">
        {renderSection('Hook', hook, 'text-status-purple font-medium text-sm', 'hook')}
        {renderSection('Body', body, 'text-text-primary whitespace-pre-wrap', 'body')}
        {renderSection('CTA', cta, 'text-status-green font-medium', 'cta')}
        
        {imageDirection && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-ui font-bold text-text-secondary tracking-widest border-b border-border-subtle pb-1 block">
              Image Direction
            </span>
            <div className="bg-bg-elevated border-l-2 border-l-status-purple rounded-r-md p-3 text-xs font-body text-text-secondary italic">
              {imageDirection}
            </div>
          </div>
        )}

        {onApprove && (
          <div className="pt-2 flex justify-end">
            <Button
              onClick={onApprove}
              disabled={isApproved}
              variant={isApproved ? "outline" : "default"}
              className={cn(
                "h-8 text-xs font-ui transition-all",
                isApproved 
                  ? "bg-bg-elevated border-border-default text-status-green cursor-not-allowed opacity-80 hover:bg-bg-elevated"
                  : "bg-status-purple hover:bg-status-purple/90 text-white"
              )}
            >
              {isApproved ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Approved
                </>
              ) : (
                <>Approve ✓</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
