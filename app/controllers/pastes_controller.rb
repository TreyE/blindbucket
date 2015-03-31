class PastesController < ApplicationController
  rescue_from ActiveRecord::RecordNotFound, :with => :record_not_found

  def record_not_found
    redirect_to new_paste_path
  end

  def new
    @paste = Paste.new
  end

  def create
    @paste = Paste.new(params.permit(paste: [:data, :burnkey])[:paste])
    if @paste.save
      respond_to do |format|
        format.js
      end
    end
  end

  def show
    @paste = Paste.find(params.permit(:id)[:id])
  end

  def burn
    @paste = Paste.find(params.permit(:id)[:id])

    burnkey = params.permit(:paste => [:burnkey])[:paste][:burnkey]

    if @paste.burnkey == burnkey
      @paste.destroy!
      redirect_to new_paste_path
    else
      redirect_to @paste
    end
  end
end
