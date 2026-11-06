import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import type { TemplateEntry } from './registry'

interface ContactNotificationProps {
  name?: string
  email?: string
  subject?: string
  message?: string
}

export function ContactNotificationEmail({
  name = 'Someone',
  email = 'unknown@example.com',
  subject = 'New enquiry',
  message = '',
}: ContactNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>{`New contact message from ${name}`}</Preview>
      <Body style={{ backgroundColor: '#f6f7fb', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '24px' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '32px', maxWidth: '560px' }}>
          <Heading style={{ fontSize: '20px', margin: '0 0 8px', color: '#0f172a' }}>
            New contact form message
          </Heading>
          <Text style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>
            Someone reached out through the EduFlow website.
          </Text>
          <Hr style={{ borderColor: '#e2e8f0' }} />
          <Section>
            <Text style={{ fontSize: '14px', color: '#0f172a', margin: '12px 0 0' }}>
              <strong>Name:</strong> {name}
            </Text>
            <Text style={{ fontSize: '14px', color: '#0f172a', margin: '6px 0 0' }}>
              <strong>Email:</strong> {email}
            </Text>
            <Text style={{ fontSize: '14px', color: '#0f172a', margin: '6px 0 12px' }}>
              <strong>Subject:</strong> {subject}
            </Text>
          </Section>
          <Hr style={{ borderColor: '#e2e8f0' }} />
          <Text style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '22px' }}>
            {message}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ContactNotificationEmail,
  displayName: 'Contact form notification',
  subject: (data: Record<string, any>) =>
    `New contact message: ${data['subject'] || 'Website enquiry'}`,
  to: 'umanagesh25@gmail.com',
  previewData: {
    name: 'Priya Rao',
    email: 'priya@college.edu',
    subject: 'Partnership idea',
    message: 'Hi! We would love to explore using EduFlow at our campus.',
  },
} satisfies TemplateEntry
