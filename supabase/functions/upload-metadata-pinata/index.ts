import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tokenData, imageUrl } = await req.json()

    const metadata = {
      name: tokenData.tokenName,
      symbol: tokenData.tokenSymbol,
      description: tokenData.description,
      image: imageUrl,
      external_url: "",
      attributes: [],
      properties: {
        files: [
          {
            uri: imageUrl,
            type: "image/png"
          }
        ],
        category: "image"
      }
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': Deno.env.get('PINATA_API_KEY')!,
        'pinata_secret_api_key': Deno.env.get('PINATA_SECRET_KEY')!
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${tokenData.tokenSymbol}-metadata`
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pinata metadata error:', errorText)
      throw new Error('Failed to upload metadata to Pinata')
    }

    const result = await response.json()
    const metadataUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`

    return new Response(
      JSON.stringify({ metadataUrl, ipfsHash: result.IpfsHash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Metadata upload error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})