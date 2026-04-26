import * as React from "react";
import { Html, Head, Preview, Body, Container, Section, Text, Button } from "@react-email/components";

interface ImmediateAlertTemplateProps {
  founderName: string;
  type: string;
  description: string;
  score: number;
}

export const ImmediateAlertTemplate: React.FC<Readonly<ImmediateAlertTemplateProps>> = ({
  founderName,
  type,
  description,
  score,
}) => (
  <Html>
    <Head />
    <Preview>High Signal Alert: {founderName} ({type})</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>🔥 High Signal Alert</Text>
          <Text style={paragraph}>
            A new high-value signal was detected for <strong>{founderName}</strong>.
          </Text>
          
          <div style={card}>
            <Text style={signalType}>{type} (Score: {score}/10)</Text>
            <Text style={signalDesc}>{description}</Text>
          </div>

          <Button style={button} href={`https://founderwatch.vercel.app/founders/`}>
            View Profile
          </Button>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const section = {
  padding: "0 48px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#111",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#333",
};

const card = {
  padding: "16px",
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  margin: "24px 0",
};

const signalType = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#09090b",
  margin: "0 0 8px 0",
};

const signalDesc = {
  fontSize: "16px",
  color: "#3f3f46",
  margin: "0",
};

const button = {
  backgroundColor: "#000",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
  fontWeight: "bold",
};
