import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { MagPouchInputs } from '../../generators/mag-pouch/types.js';
import { MagazineSection } from './sections/MagazineSection.js';
import { FitSection } from './sections/FitSection.js';
import { RetentionSection } from './sections/RetentionSection.js';
import { ClosureSection } from './sections/ClosureSection.js';
import { AttachmentSection } from './sections/AttachmentSection.js';
import { DrainageSection } from './sections/DrainageSection.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
}

export function MagPouchSettingsPanel({ inputs, errors, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={['magazine']} className="rounded border border-border px-3">
        <AccordionItem value="magazine">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Magazine
          </AccordionTrigger>
          <AccordionContent>
            <MagazineSection
              magazine={inputs.magazine}
              errors={errors}
              onChange={spec => onChange({ magazine: spec })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fit">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Fit
          </AccordionTrigger>
          <AccordionContent>
            <FitSection inputs={inputs} errors={errors} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="retention">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Retention
          </AccordionTrigger>
          <AccordionContent>
            <RetentionSection inputs={inputs} errors={errors} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="closure">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Closure
          </AccordionTrigger>
          <AccordionContent>
            <ClosureSection inputs={inputs} errors={errors} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="attachment">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Attachment
          </AccordionTrigger>
          <AccordionContent>
            <AttachmentSection inputs={inputs} errors={errors} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="drainage">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Drainage
          </AccordionTrigger>
          <AccordionContent>
            <DrainageSection inputs={inputs} errors={errors} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
