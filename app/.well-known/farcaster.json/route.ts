export async function GET() {
    const appUrl = process.env.NEXT_PUBLIC_URL
    const farcasterHeader = process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER
    const farcasterPayload = process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD
    const farcasterSignature =
        process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE

    if (!appUrl) {
        throw new Error('NEXT_PUBLIC_URL is not set')
    }

    if (!farcasterHeader || !farcasterPayload || !farcasterSignature) {
        throw new Error(
            'Farcaster account association environment variables are not set'
        )
    }

    const config = {
        accountAssociation: {
            header: farcasterHeader,
            payload: farcasterPayload,
            signature: farcasterSignature,
        },
        frame: {
            version: '1',
            name: 'Ember Island',
            iconUrl: `${appUrl}/images/icon.png`,
            homeUrl: appUrl,
            imageUrl: `${appUrl}/images/frame-image.png`,
            buttonTitle: 'Play',
            splashImageUrl: `${appUrl}/images/icon.png`,
            splashBackgroundColor: '#27213C',
            webhookUrl: `${appUrl}/api/webhook`,
        },
    }

    return Response.json(config)
}
