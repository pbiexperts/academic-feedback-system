import logging

logger = logging.getLogger(__name__)

async def send_email_async(to_email: str, subject: str, body: str):
    """
    Dummy asynchronous email sender.
    In a real 10/10 production system, this would use fastapi-mail or smtplib
    and connect to an SMTP server.
    For now, it simulates the network delay and logs to console to prove
    background task execution without blocking the API.
    """
    import asyncio
    
    # Simulate SMTP connection delay
    await asyncio.sleep(0.5)
    
    # Log the email (simulating sent status)
    print(f"========== EMAIL SENT ==========")
    print(f"TO: {to_email}")
    print(f"SUBJECT: {subject}")
    print(f"BODY:\n{body}")
    print(f"================================")
    
    logger.info(f"Email successfully sent to {to_email}")
