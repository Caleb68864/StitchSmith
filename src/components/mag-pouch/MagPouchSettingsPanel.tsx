import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { MagPouchInputs, MagPouchDerived } from '../../generators/mag-pouch/types.js';
import { MagazineSection } from './sections/MagazineSection.js';
import { ConstructionSection } from './sections/ConstructionSection.js';
import { FitSection } from './sections/FitSection.js';
import { RetentionSection } from './sections/RetentionSection.js';
import { ClosureSection } from './sections/ClosureSection.js';
import { AttachmentSection } from './sections/AttachmentSection.js';
import { DrainageSection } from './sections/DrainageSection.js';

interface Props {
  inputs: MagPouchInputs;
  errors: Record<string, string>;
  onChange: (changes: Partial<MagPouchInputs>) => void;
  derived?: MagPouchDerived | null;
}

export function MagPouchSettingsPanel({ inputs, errors, onChange, derived }: Props) {
  const isCard = inputs.construction === 'pleated_card';
  return (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={['magazine', 'construction']} className="rounded border border-border px-3">
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

        <AccordionItem value="construction">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Construction
          </AccordionTrigger>
          <AccordionContent>
            <ConstructionSection inputs={inputs} errors={errors} onChange={onChange} derived={derived} />
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

        {!isCard && (
          <AccordionItem value="drainage">
            <AccordionTrigger className="text-xs font-semibold py-3">
              Drainage
            </AccordionTrigger>
            <AccordionContent>
              <DrainageSection inputs={inputs} errors={errors} onChange={onChange} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
