class PastesController < ApplicationController
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
  end
end
