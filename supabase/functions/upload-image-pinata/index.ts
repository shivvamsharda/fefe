import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pinataFormData = new FormData()
    pinataFormData.append('file', file)
    
    const pinataMetadata = JSON.stringify({
      name: `token-image-${Date.now()}`,
    })
    pinataFormData.append('pinataMetadata', pinataMetadata)

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': Deno.env.get('PINATA_API_KEY')!,
        'pinata_secret_api_key': Deno.env.get('PINATA_SECRET_KEY')!
      },
      body: pinataFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pinata error:', errorText)
      throw new Error('Failed to upload image to Pinata')
    }

    const result = await response.json()
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`

    return new Response(
      JSON.stringify({ imageUrl, ipfsHash: result.IpfsHash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})