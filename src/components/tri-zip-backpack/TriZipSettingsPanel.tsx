import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { TriZipInputs } from '../../generators/tri-zip-backpack/types.js';
import { StyleAndDimensionsSection } from './sections/StyleAndDimensionsSection.js';
import { TriZipGeometrySection } from './sections/TriZipGeometrySection.js';
import { ZipperSystemSection } from './sections/ZipperSystemSection.js';
import { BackPanelSection } from './sections/BackPanelSection.js';
import { ShoulderStrapsSection } from './sections/ShoulderStrapsSection.js';
import { SternumHipSection } from './sections/SternumHipSection.js';
import { TopHandleSection } from './sections/TopHandleSection.js';
import { CompressionSection } from './sections/CompressionSection.js';
import { FrameSheetSection } from './sections/FrameSheetSection.js';
import { LaptopSleeveSection } from './sections/LaptopSleeveSection.js';

interface Props {
  inputs: TriZipInputs;
  errors: Record<string, string>;
  topHandleLength: number;
  onChange: (changes: Partial<TriZipInputs>) => void;
  onTopHandleLengthChange: (length: number) => void;
}

export function TriZipSettingsPanel({
  inputs,
  errors,
  topHandleLength,
  onChange,
  onTopHandleLengthChange,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="rounded border border-border p-3">
        <h2 className="text-xs font-semibold mb-3">Style &amp; Dimensions</h2>
        <StyleAndDimensionsSection inputs={inputs} errors={errors} onChange={onChange} />
      </div>

      <Accordion type="multiple" className="rounded border border-border px-3">
        <AccordionItem value="geometry">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Tri-Zip Geometry
          </AccordionTrigger>
          <AccordionContent>
            <TriZipGeometrySection inputs={inputs} errors={errors} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="zipper">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Zipper System
          </AccordionTrigger>
          <AccordionContent>
            <ZipperSystemSection inputs={inputs} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="back-panel">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Back Panel
          </AccordionTrigger>
          <AccordionContent>
            <BackPanelSection inputs={inputs} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="shoulder-straps">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Shoulder Straps
          </AccordionTrigger>
          <AccordionContent>
            <ShoulderStrapsSection inputs={inputs} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sternum-hip">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Sternum &amp; Hip Belt
          </AccordionTrigger>
          <AccordionContent>
            <SternumHipSection inputs={inputs} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="top-handle">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Top Handle
          </AccordionTrigger>
          <AccordionContent>
            <TopHandleSection
              topHandleLength={topHandleLength}
              onChange={onTopHandleLengthChange}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="compression">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Compression Straps
          </AccordionTrigger>
          <AccordionContent>
            <CompressionSection inputs={inputs} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="frame-sheet">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Frame Sheet
          </AccordionTrigger>
          <AccordionContent>
            <FrameSheetSection inputs={inputs} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="laptop-sleeve">
          <AccordionTrigger className="text-xs font-semibold py-3">
            Laptop Sleeve
          </AccordionTrigger>
          <AccordionContent>
            <LaptopSleeveSection inputs={inputs} onChange={onChange} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
