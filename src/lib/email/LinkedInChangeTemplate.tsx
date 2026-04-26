import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

export interface LinkedInChangeTemplateProps {
  founderId: string;
  founderName: string;
  changes: string[];
  description: string;
  score: number;
  source?: string;
}

function getScoreEmoji(score: number): string {
  if (score >= 7) return "🔥";
  if (score >= 4) return "📊";
  return "📌";
}

function getScoreLabel(score: number): string {
  if (score >= 7) return "High Signal";
  if (score >= 4) return "Medium Signal";
  return "Low Signal";
}

function getScoreColor(score: number): string {
  if (score >= 7) return "#22c55e";
  if (score >= 4) return "#f59e0b";
  return "#94a3b8";
}

export const LinkedInChangeTemplate: React.FC<Readonly<LinkedInChangeTemplateProps>> = ({
  founderId,
  founderName,
  changes,
  description,
  score,
  source = "Proxycurl",
}) => (
  <Html>
    <Head />
    <Preview>
      {getScoreEmoji(score)} {founderName} updated their LinkedIn — {description.slice(0, 90)}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerSection}>
          <Text style={logoText}>FounderWatch</Text>
        </Section>

        {/* Body */}
        <Section style={bodySection}>
          <Text style={heading}>LinkedIn Profile Update</Text>
          <Text style={subheading}>
            <strong>{founderName}</strong> has updated their LinkedIn profile.
          </Text>

          {/* Score pill */}
          <div style={scorePill}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={scoreLabelText}>
                {getScoreEmoji(score)} {getScoreLabel(score)}
              </Text>
              <Text style={{ ...scoreNumberText, color: getScoreColor(score) }}>
                {score}/10
              </Text>
            </div>
            <Text style={scoreSubtext}>
              Relevance score from AI analysis
            </Text>
          </div>

          {/* What changed */}
          <div style={changesCard}>
            <Text style={changesCardTitle}>WHAT CHANGED</Text>
            {changes.map((change, i) => (
              <Text key={i} style={changeItemText}>
                • {change}
              </Text>
            ))}
          </div>

          {/* Full description */}
          <Text style={descText}>{description}</Text>

          <Hr style={divider} />

          {/* CTA */}
          <Button
            style={ctaButton}
            href={`https://founderwatch.vercel.app/founders/${founderId}`}
          >
            View Full Profile →
          </Button>

          <Text style={sourceText}>Detected by: {source}</Text>
        </Section>

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            You received this alert because you are assigned to this founder on FounderWatch.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles
const main: React.CSSProperties = {
  backgroundColor: "#0f172a",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#1e293b",
  margin: "0 auto",
  maxWidth: "580px",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid #334155",
};

const headerSection: React.CSSProperties = {
  backgroundColor: "#0f172a",
  padding: "20px 40px",
  borderBottom: "1px solid #334155",
};

const logoText: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#818cf8",
  margin: "0",
};

const bodySection: React.CSSProperties = {
  padding: "32px 40px",
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#f1f5f9",
  margin: "0 0 6px 0",
};

const subheading: React.CSSProperties = {
  fontSize: "15px",
  color: "#94a3b8",
  margin: "0 0 24px 0",
  lineHeight: "1.5",
};

const scorePill: React.CSSProperties = {
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  padding: "14px 18px",
  marginBottom: "16px",
  border: "1px solid #334155",
};

const scoreLabelText: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#cbd5e1",
  margin: "0",
};

const scoreNumberText: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "bold",
  margin: "0",
};

const scoreSubtext: React.CSSProperties = {
  fontSize: "11px",
  color: "#475569",
  margin: "4px 0 0 0",
};

const changesCard: React.CSSProperties = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  padding: "14px 18px",
  marginBottom: "16px",
};

const changesCardTitle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: "700",
  color: "#475569",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  margin: "0 0 10px 0",
};

const changeItemText: React.CSSProperties = {
  fontSize: "14px",
  color: "#e2e8f0",
  margin: "4px 0",
  lineHeight: "1.5",
};

const descText: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  margin: "0 0 24px 0",
  lineHeight: "1.6",
};

const divider: React.CSSProperties = {
  borderColor: "#334155",
  margin: "0 0 24px 0",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#6366f1",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
  fontWeight: "600",
  fontSize: "14px",
  marginBottom: "16px",
};

const sourceText: React.CSSProperties = {
  fontSize: "11px",
  color: "#475569",
  margin: "0",
};

const footerSection: React.CSSProperties = {
  backgroundColor: "#0f172a",
  padding: "16px 40px",
  borderTop: "1px solid #334155",
};

const footerText: React.CSSProperties = {
  fontSize: "11px",
  color: "#475569",
  margin: "0",
  lineHeight: "1.5",
};
