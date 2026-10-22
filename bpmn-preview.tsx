import { useState } from "react";
import { createRoot } from "react-dom/client";
import BpmnEditor from "@/components/documents/BpmnEditor";
import "@/styles/globals.css";

const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false" />
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1" />
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

function Preview() {
  const [xml, setXml] = useState(INITIAL_XML);

  return (
    <div className="min-h-dvh bg-background p-8">
      <BpmnEditor xml={xml} onChange={setXml} fileName="preview" />
      <pre id="xml" className="sr-only">
        {xml}
      </pre>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Preview />);
