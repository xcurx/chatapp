import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { LogOut } from 'lucide-react'
import axios from 'axios'

const LogoutDialog = () => {
    const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild className="cursor-pointer bg-white rounded-lg">
            <Button 
             variant={"outline"} 
             className='bg-zinc-950'
            >
                <LogOut/>
            </Button>
        </DialogTrigger>
        <DialogContent className="flex flex-col items-center w-[300px] sm:text-base xs:text-sm text-xs">
          <DialogHeader className="flex flex-col items-center">
            <DialogTitle className="text-2xl">Sign out</DialogTitle>
            <div className="mt-3">
              <div className='mb-4 text-center'>Continue with sign out?</div>
             <div className='space-x-4'>
                <Button 
                 variant={"secondary"} 
                 size={"lg"}
                 onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                 variant={"default"}
                 size={"lg"}
                 onClick={async () => {
                    await axios.post("/api/sign-out");
                    window.location.reload();
                 }}
                >
                  Sign out
                </Button>
             </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
  )
}

export default LogoutDialog
